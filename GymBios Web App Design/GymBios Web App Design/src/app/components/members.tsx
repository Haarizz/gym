import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Calendar as CalendarComponent } from "./ui/calendar";
import { Checkbox } from "./ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "./ui/dropdown-menu";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "./ui/collapsible";
import { MemberApprovalModal } from "./member-approval-modal";
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadialBarChart, RadialBar, Cell, Legend,
} from 'recharts';
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
  XCircle,
  Bell,
  Receipt,
  Hash,
  User,
  ChevronDown,
  Activity,
  Award,
  Target,
  Zap,
  CalendarDays,
  DollarSign,
  Star,
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { membersService, Member } from '../utils/supabase/members-service';
import { authService } from '../utils/supabase/auth-service';

const membershipPlans = [
  { 
    id: 1,
    name: "Basic Monthly", 
    planType: "Standard",
    membershipType: "Individual",
    durationType: "Monthly",
    durationValue: 1,
    price: 299, 
    discount: 0,
    maxSessions: 0,
    assignableTrainers: [],
    description: "Perfect for beginners who want access to basic gym facilities and equipment.",
    duration: "1 month", 
    level: 1,
    features: ["Gym access", "Locker room", "Basic equipment"] 
  },
  { 
    id: 2,
    name: "Standard Monthly", 
    planType: "Standard",
    membershipType: "Individual",
    durationType: "Monthly",
    durationValue: 1,
    price: 499, 
    discount: 0,
    maxSessions: 8,
    assignableTrainers: ["Any Trainer"],
    description: "Ideal for members who want gym access plus group fitness classes and additional amenities.",
    duration: "1 month", 
    level: 2,
    features: ["Basic + Group classes", "Guest pass", "Towel service"] 
  },
  { 
    id: 3,
    name: "Premium Monthly", 
    planType: "Premium",
    membershipType: "Individual",
    durationType: "Monthly",
    durationValue: 1,
    price: 799, 
    discount: 0,
    maxSessions: 12,
    assignableTrainers: ["Senior Trainer", "Specialist"],
    description: "Comprehensive membership with personal training sessions, nutrition guidance, and priority access.",
    duration: "1 month", 
    level: 3,
    features: ["Standard + Personal training", "Nutrition consultation", "Priority booking"] 
  },
  { 
    id: 4,
    name: "Gold Quarterly", 
    planType: "Premium",
    membershipType: "Individual",
    durationType: "Quarterly",
    durationValue: 3,
    price: 2199, 
    discount: 10,
    maxSessions: 36,
    assignableTrainers: ["Senior Trainer", "Specialist", "Master Trainer"],
    description: "Three-month premium membership with significant savings and comprehensive fitness support.",
    duration: "3 months", 
    level: 4,
    features: ["Premium benefits", "3 months access", "10% discount", "Free fitness assessment"] 
  },
  { 
    id: 5,
    name: "Platinum Annual", 
    planType: "VIP",
    membershipType: "Individual",
    durationType: "Annual",
    durationValue: 12,
    price: 7999, 
    discount: 20,
    maxSessions: 144,
    assignableTrainers: ["All Trainers", "Master Trainer", "Celebrity Trainer"],
    description: "Our most exclusive membership with unlimited access to all facilities, premium services, and personalized wellness programs.",
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
  const [selectedMemberForAnalytics, setSelectedMemberForAnalytics] = useState<any>(null);
  const [analyticsTab, setAnalyticsTab] = useState('overview');
  
  // Membership Report states
  const [reportGenerated, setReportGenerated] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportData, setReportData] = useState<any[]>([]);
  const [reportPage, setReportPage] = useState(1);
  const [reportPageSize] = useState(20);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  
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

  // Renewal & Upgrade Transaction History Data
  const renewalTransactions = [
    { id: "TXN001", memberId: "GYM001", memberName: "John Smith", transactionType: "Renewal", previousPlan: "Basic Monthly", newPlan: "Basic Monthly", amount: "AED 120", paymentMethod: "Card", transactionDate: "2024-01-02 10:30 AM", newExpiryDate: "2024-02-15", processedBy: "Admin", status: "Completed", receiptNo: "RCP-2024-001" },
    { id: "TXN002", memberId: "GYM002", memberName: "Sarah Johnson", transactionType: "Upgrade", previousPlan: "Basic Monthly", newPlan: "Premium Monthly", amount: "AED 240", paymentMethod: "Cash", transactionDate: "2024-01-03 02:15 PM", newExpiryDate: "2024-03-20", processedBy: "Manager", status: "Completed", receiptNo: "RCP-2024-002" },
    { id: "TXN003", memberId: "GYM003", memberName: "Mike Wilson", transactionType: "Renewal", previousPlan: "Premium Annual", newPlan: "Premium Annual", amount: "AED 2,400", paymentMethod: "Bank Transfer", transactionDate: "2024-01-04 11:00 AM", newExpiryDate: "2025-12-31", processedBy: "Admin", status: "Completed", receiptNo: "RCP-2024-003" },
    { id: "TXN004", memberId: "GYM004", memberName: "Emily Davis", transactionType: "Upgrade", previousPlan: "Basic Monthly", newPlan: "VIP Annual", amount: "AED 3,600", paymentMethod: "Card", transactionDate: "2024-01-05 09:45 AM", newExpiryDate: "2025-01-10", processedBy: "Manager", status: "Completed", receiptNo: "RCP-2024-004" },
    { id: "TXN005", memberId: "GYM005", memberName: "Ahmed Hassan", transactionType: "Renewal", previousPlan: "VIP Annual", newPlan: "VIP Annual", amount: "AED 3,600", paymentMethod: "Online Payment", transactionDate: "2024-01-06 03:30 PM", newExpiryDate: "2024-12-25", processedBy: "Admin", status: "Completed", receiptNo: "RCP-2024-005" },
    { id: "TXN006", memberId: "GYM006", memberName: "Fatima Ali", transactionType: "Upgrade", previousPlan: "Basic Monthly", newPlan: "Premium Monthly", amount: "AED 240", paymentMethod: "Card", transactionDate: "2024-01-07 01:20 PM", newExpiryDate: "2024-02-18", processedBy: "Admin", status: "Completed", receiptNo: "RCP-2024-006" },
    { id: "TXN007", memberId: "GYM007", memberName: "David Lee", transactionType: "Renewal", previousPlan: "Premium Monthly", newPlan: "Premium Monthly", amount: "AED 240", paymentMethod: "Cash", transactionDate: "2024-01-08 10:15 AM", newExpiryDate: "2024-02-25", processedBy: "Manager", status: "Completed", receiptNo: "RCP-2024-007" },
    { id: "TXN008", memberId: "GYM008", memberName: "Lisa Martinez", transactionType: "Upgrade", previousPlan: "Basic Annual", newPlan: "Premium Annual", amount: "AED 2,400", paymentMethod: "Card", transactionDate: "2024-01-09 04:45 PM", newExpiryDate: "2025-01-09", processedBy: "Admin", status: "Completed", receiptNo: "RCP-2024-008" },
    { id: "TXN009", memberId: "GYM009", memberName: "Omar Al-Rashid", transactionType: "Renewal", previousPlan: "Basic Monthly", newPlan: "Basic Monthly", amount: "AED 120", paymentMethod: "Online Payment", transactionDate: "2024-01-10 11:30 AM", newExpiryDate: "2024-02-12", processedBy: "Admin", status: "Completed", receiptNo: "RCP-2024-009" },
    { id: "TXN010", memberId: "GYM010", memberName: "Jessica Wong", transactionType: "Upgrade", previousPlan: "Premium Monthly", newPlan: "VIP Annual", amount: "AED 3,600", paymentMethod: "Bank Transfer", transactionDate: "2024-01-11 02:00 PM", newExpiryDate: "2025-01-11", processedBy: "Manager", status: "Completed", receiptNo: "RCP-2024-010" },
    { id: "TXN011", memberId: "GYM011", memberName: "Tom Anderson", transactionType: "Renewal", previousPlan: "Premium Annual", newPlan: "Premium Annual", amount: "AED 2,400", paymentMethod: "Card", transactionDate: "2024-01-12 09:15 AM", newExpiryDate: "2025-01-12", processedBy: "Admin", status: "Completed", receiptNo: "RCP-2024-011" },
    { id: "TXN012", memberId: "GYM012", memberName: "Aisha Mohammed", transactionType: "Upgrade", previousPlan: "Basic Monthly", newPlan: "Basic Annual", amount: "AED 1,200", paymentMethod: "Cash", transactionDate: "2024-01-13 03:45 PM", newExpiryDate: "2025-01-13", processedBy: "Manager", status: "Completed", receiptNo: "RCP-2024-012" },
    { id: "TXN013", memberId: "GYM013", memberName: "Carlos Rodriguez", transactionType: "Renewal", previousPlan: "VIP Annual", newPlan: "VIP Annual", amount: "AED 3,600", paymentMethod: "Card", transactionDate: "2024-01-14 10:30 AM", newExpiryDate: "2025-01-14", processedBy: "Admin", status: "Completed", receiptNo: "RCP-2024-013" },
    { id: "TXN014", memberId: "GYM014", memberName: "Priya Patel", transactionType: "Upgrade", previousPlan: "Basic Annual", newPlan: "VIP Annual", amount: "AED 3,600", paymentMethod: "Online Payment", transactionDate: "2024-01-15 01:15 PM", newExpiryDate: "2025-01-15", processedBy: "Manager", status: "Completed", receiptNo: "RCP-2024-014" },
    { id: "TXN015", memberId: "GYM015", memberName: "James Brown", transactionType: "Renewal", previousPlan: "Premium Monthly", newPlan: "Premium Monthly", amount: "AED 240", paymentMethod: "Bank Transfer", transactionDate: "2024-01-16 04:00 PM", newExpiryDate: "2024-02-16", processedBy: "Admin", status: "Completed", receiptNo: "RCP-2024-015" }
  ];

  // Freeze / Unfreeze Transaction History Data
  const freezeTransactions = [
    { id: "FRZ001", memberId: "GYM001", memberName: "John Smith", action: "Freeze", reason: "Medical Emergency", freezeStartDate: "2024-01-05", freezeEndDate: "2024-02-05", duration: "31 days", freezeFee: "AED 0", extraDaysFee: "AED 0", totalDays: 31, transactionDate: "2024-01-05 09:30 AM", processedBy: "Admin", status: "Active", receiptNo: "FRZ-2024-001" },
    { id: "FRZ002", memberId: "GYM002", memberName: "Sarah Johnson", action: "Unfreeze", reason: "Vacation ended", freezeStartDate: "2023-12-15", freezeEndDate: "2024-01-08", duration: "24 days", freezeFee: "AED 0", extraDaysFee: "AED 0", totalDays: 24, transactionDate: "2024-01-08 11:15 AM", processedBy: "Manager", status: "Completed", receiptNo: "UFR-2024-001" },
    { id: "FRZ003", memberId: "GYM003", memberName: "Mike Wilson", action: "Freeze", reason: "Travel", freezeStartDate: "2024-01-10", freezeEndDate: "2024-02-25", duration: "46 days", freezeFee: "AED 50", extraDaysFee: "AED 50", totalDays: 46, transactionDate: "2024-01-10 02:45 PM", processedBy: "Admin", status: "Active", receiptNo: "FRZ-2024-002" },
    { id: "FRZ004", memberId: "GYM004", memberName: "Emily Davis", action: "Unfreeze", reason: "Early return", freezeStartDate: "2023-12-20", freezeEndDate: "2024-01-12", duration: "23 days", freezeFee: "AED 0", extraDaysFee: "AED 0", totalDays: 23, transactionDate: "2024-01-12 10:20 AM", processedBy: "Admin", status: "Completed", receiptNo: "UFR-2024-002" },
    { id: "FRZ005", memberId: "GYM005", memberName: "Ahmed Hassan", action: "Freeze", reason: "Injury Recovery", freezeStartDate: "2024-01-15", freezeEndDate: "2024-03-15", duration: "60 days", freezeFee: "AED 100", extraDaysFee: "AED 100", totalDays: 60, transactionDate: "2024-01-15 03:00 PM", processedBy: "Manager", status: "Active", receiptNo: "FRZ-2024-003" },
    { id: "FRZ006", memberId: "GYM006", memberName: "Fatima Ali", action: "Unfreeze", reason: "Membership resumed", freezeStartDate: "2023-12-01", freezeEndDate: "2024-01-18", duration: "48 days", freezeFee: "AED 50", extraDaysFee: "AED 50", totalDays: 48, transactionDate: "2024-01-18 09:45 AM", processedBy: "Admin", status: "Completed", receiptNo: "UFR-2024-003" },
    { id: "FRZ007", memberId: "GYM007", memberName: "David Lee", action: "Freeze", reason: "Business Trip", freezeStartDate: "2024-01-20", freezeEndDate: "2024-02-10", duration: "21 days", freezeFee: "AED 0", extraDaysFee: "AED 0", totalDays: 21, transactionDate: "2024-01-20 11:30 AM", processedBy: "Manager", status: "Active", receiptNo: "FRZ-2024-004" },
    { id: "FRZ008", memberId: "GYM008", memberName: "Lisa Martinez", action: "Unfreeze", reason: "Completed recovery", freezeStartDate: "2023-11-25", freezeEndDate: "2024-01-22", duration: "58 days", freezeFee: "AED 80", extraDaysFee: "AED 80", totalDays: 58, transactionDate: "2024-01-22 02:15 PM", processedBy: "Admin", status: "Completed", receiptNo: "UFR-2024-004" },
    { id: "FRZ009", memberId: "GYM009", memberName: "Omar Al-Rashid", action: "Freeze", reason: "Personal Reasons", freezeStartDate: "2024-01-25", freezeEndDate: "2024-02-20", duration: "26 days", freezeFee: "AED 0", extraDaysFee: "AED 0", totalDays: 26, transactionDate: "2024-01-25 10:00 AM", processedBy: "Admin", status: "Active", receiptNo: "FRZ-2024-005" },
    { id: "FRZ010", memberId: "GYM010", memberName: "Jessica Wong", action: "Unfreeze", reason: "Back from vacation", freezeStartDate: "2023-12-10", freezeEndDate: "2024-01-28", duration: "49 days", freezeFee: "AED 50", extraDaysFee: "AED 50", totalDays: 49, transactionDate: "2024-01-28 01:30 PM", processedBy: "Manager", status: "Completed", receiptNo: "UFR-2024-005" },
    { id: "FRZ011", memberId: "GYM011", memberName: "Tom Anderson", action: "Freeze", reason: "Surgery", freezeStartDate: "2024-02-01", freezeEndDate: "2024-03-10", duration: "38 days", freezeFee: "AED 30", extraDaysFee: "AED 30", totalDays: 38, transactionDate: "2024-02-01 09:15 AM", processedBy: "Admin", status: "Active", receiptNo: "FRZ-2024-006" },
    { id: "FRZ012", memberId: "GYM012", memberName: "Aisha Mohammed", action: "Unfreeze", reason: "Ready to resume", freezeStartDate: "2023-12-05", freezeEndDate: "2024-02-03", duration: "60 days", freezeFee: "AED 100", extraDaysFee: "AED 100", totalDays: 60, transactionDate: "2024-02-03 11:45 AM", processedBy: "Manager", status: "Completed", receiptNo: "UFR-2024-006" },
    { id: "FRZ013", memberId: "GYM013", memberName: "Carlos Rodriguez", action: "Freeze", reason: "Family Emergency", freezeStartDate: "2024-02-05", freezeEndDate: "2024-02-25", duration: "20 days", freezeFee: "AED 0", extraDaysFee: "AED 0", totalDays: 20, transactionDate: "2024-02-05 03:20 PM", processedBy: "Admin", status: "Active", receiptNo: "FRZ-2024-007" },
    { id: "FRZ014", memberId: "GYM014", memberName: "Priya Patel", action: "Unfreeze", reason: "Vacation completed", freezeStartDate: "2023-11-20", freezeEndDate: "2024-02-08", duration: "80 days", freezeFee: "AED 150", extraDaysFee: "AED 150", totalDays: 80, transactionDate: "2024-02-08 10:10 AM", processedBy: "Admin", status: "Completed", receiptNo: "UFR-2024-007" },
    { id: "FRZ015", memberId: "GYM015", memberName: "James Brown", action: "Freeze", reason: "Temporary Relocation", freezeStartDate: "2024-02-10", freezeEndDate: "2024-03-05", duration: "24 days", freezeFee: "AED 0", extraDaysFee: "AED 0", totalDays: 24, transactionDate: "2024-02-10 02:30 PM", processedBy: "Manager", status: "Active", receiptNo: "FRZ-2024-008" }
  ];

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

  // Handle tab navigation - redirect to dedicated screens
  useEffect(() => {
    if (activeTab === "addons" && onNavigate) {
      onNavigate("member-addons");
    }
  }, [activeTab, onNavigate]);

  const getStatusBadgeClass = (status: string) => {
    switch (status.toLowerCase()) {
      case "active": return "bg-green-100 text-green-800";
      case "inactive": return "bg-gray-100 text-gray-800";
      case "suspended": return "bg-orange-100 text-orange-800";
      case "expired": return "bg-red-100 text-red-800";
      case "frozen": return "bg-[#327F74]/10 text-[#327F74]";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const totalMembersCount = totalMembers;
  const activeMembers = members.filter(m => m.membership_status === "active").length;
  const inactiveMembers = members.filter(m => m.membership_status === "inactive").length;
  const expiredMembers = members.filter(m => m.membership_status === "expired").length;
  const freezedMembers = members.filter(m => m.membership_status === "frozen").length;
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <Card 
          className="cursor-pointer hover:shadow-lg transition-shadow" 
          onClick={() => setSelectedStatus("all")}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Members</CardTitle>
            <UserPlus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalMembersCount}</div>
            <p className="text-xs text-muted-foreground">Registered members</p>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:shadow-lg transition-shadow" 
          onClick={() => setSelectedStatus("active")}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Members</CardTitle>
            <UserPlus className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{activeMembers}</div>
            <p className="text-xs text-muted-foreground">Currently active</p>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:shadow-lg transition-shadow" 
          onClick={() => setSelectedStatus("inactive")}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inactive</CardTitle>
            <Pause className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{inactiveMembers}</div>
            <p className="text-xs text-muted-foreground">Inactive members</p>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:shadow-lg transition-shadow" 
          onClick={() => setSelectedStatus("expired")}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expired</CardTitle>
            <Calendar className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{expiredMembers}</div>
            <p className="text-xs text-muted-foreground">Need renewal</p>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:shadow-lg transition-shadow" 
          onClick={() => setSelectedStatus("frozen")}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Freezed</CardTitle>
            <Snowflake className="h-4 w-4 text-[#327F74]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#327F74]">{freezedMembers}</div>
            <p className="text-xs text-muted-foreground">Membership frozen</p>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:shadow-lg transition-shadow" 
          onClick={() => setSelectedStatus("suspended")}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Suspended</CardTitle>
            <XCircle className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{suspendedMembers}</div>
            <p className="text-xs text-muted-foreground">Suspended members</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="members">All Members</TabsTrigger>
          <TabsTrigger value="renewals">Renewals & Upgrades</TabsTrigger>
          <TabsTrigger value="addons">Add-ons</TabsTrigger>
          <TabsTrigger value="receipts">Member Receipts</TabsTrigger>
          <TabsTrigger value="freeze">Freeze/Unfreeze</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="members" className="space-y-6">
          <Card>
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
                    <SelectItem value="frozen">Frozen</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline">
                  <Filter className="mr-2 h-4 w-4" />
                  More Filters
                </Button>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
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
                        <TableRow key={member.id}>
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
                                      <Eye className="h-4 w-4 mr-2" />
                                      View Profile
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      className="cursor-pointer"
                                      onClick={() => {
                                        setSelectedMemberForAnalytics(member);
                                        setAnalyticsTab('overview');
                                      }}
                                    >
                                      <BarChart3 className="h-4 w-4 mr-2" />
                                      Analytics
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

        <TabsContent value="renewals" className="space-y-6">
          {/* Header with Breadcrumb */}
          <div className="flex items-center space-x-2 text-sm text-muted-foreground mb-2">
            <span>Community</span>
            <ChevronRight className="h-4 w-4" />
            <span>Members</span>
            <ChevronRight className="h-4 w-4" />
            <span className="text-foreground font-medium">Renewals & Upgrades</span>
          </div>
          
          <div className="flex items-center space-x-3 mb-6">
            <div className="bg-gradient-primary p-3 rounded-xl text-white">
              <RefreshCw className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Renewals & Upgrades</h2>
              <p className="text-sm text-muted-foreground">Seamlessly manage member renewal and upgrade operations</p>
            </div>
          </div>

          {/* Step 1: Search Member Section */}
          <Card className="shadow-md">
            <CardHeader className="bg-gradient-light">
              <div className="flex items-center space-x-2">
                <div className="bg-gradient-primary text-white rounded-full w-8 h-8 flex items-center justify-center">
                  1
                </div>
                <CardTitle>Search Member</CardTitle>
              </div>
              <CardDescription>Search by Name, Mobile, Member ID, or Email</CardDescription>
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
            <Card className="shadow-md">
              <CardHeader className="bg-gradient-light">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="bg-gradient-primary text-white rounded-full w-8 h-8 flex items-center justify-center">
                      2
                    </div>
                    <CardTitle>Choose New Plan</CardTitle>
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
                <CardDescription>Select a membership plan to renew or upgrade</CardDescription>
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
                      >
                        <div onClick={() => handlePlanSelection(plan)}>
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
                            <div className="w-full mt-4 py-2 px-4 bg-gradient-primary text-white text-center rounded-md text-sm font-medium">
                              Selected
                            </div>
                          )}
                        </CardContent>
                        </div>
                      </Card>
                    );
                  })}
                </div>
                
                {/* Operation Type Indicator */}
                {operationType && (
                  <Card className={`mt-6 border-2 ${
                    operationType === 'renewal' 
                      ? 'border-green-500 bg-green-50' 
                      : 'border-red-500 bg-red-50'
                  }`}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-center space-x-3">
                        {operationType === 'renewal' ? (
                          <>
                            <div className="bg-green-500 text-white rounded-full p-2">
                              <RefreshCw className="h-5 w-5" />
                            </div>
                            <div>
                              <p className="font-bold text-green-800">🟢 Detected as Renewal</p>
                              <p className="text-sm text-green-700">
                                Member is renewing their current plan: {selectedNewPlan.name}
                              </p>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="bg-red-500 text-white rounded-full p-2">
                              <TrendingUp className="h-5 w-5" />
                            </div>
                            <div>
                              <p className="font-bold text-red-800">🔴 Detected as Upgrade</p>
                              <p className="text-sm text-red-700">
                                Member is upgrading from {getMembershipPlan(selectedMemberForRenewal)} to {selectedNewPlan.name}
                              </p>
                            </div>
                          </>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </CardContent>
            </Card>
          )}

          {/* Step 3: Payment Section */}
          {selectedNewPlan && (
            <Card className="shadow-md">
              <CardHeader className="bg-gradient-light">
                <div className="flex items-center space-x-2">
                  <div className="bg-gradient-primary text-white rounded-full w-8 h-8 flex items-center justify-center">
                    3
                  </div>
                  <CardTitle>Payment Details</CardTitle>
                </div>
                <CardDescription>Configure payment method and apply discounts</CardDescription>
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
            <Card className="shadow-md">
              <CardHeader className="bg-gradient-light">
                <div className="flex items-center space-x-2">
                  <div className="bg-gradient-primary text-white rounded-full w-8 h-8 flex items-center justify-center">
                    4
                  </div>
                  <CardTitle>Confirmation</CardTitle>
                </div>
                <CardDescription>Review details before processing</CardDescription>
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
                        {operationType === 'renewal' ? '🔁 Renewal' : '⬆️ Upgrade'}
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
            <DialogContent className="sm:max-w-[500px]" aria-describedby="success-dialog-description">
              <div className="text-center py-6">
                <div className="bg-gradient-primary rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="h-12 w-12 text-white" />
                </div>
                <DialogTitle className="text-2xl mb-2">
                  🎉 Membership Successfully {operationType === 'renewal' ? 'Renewed' : 'Upgraded'}!
                </DialogTitle>
                <DialogDescription id="success-dialog-description" className="sr-only">
                  Membership operation completed successfully with payment confirmation
                </DialogDescription>
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
                  <TableHeader>
                    <TableRow>
                      <TableHead>Plan Name</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Features</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {membershipPlans.map((plan) => (
                      <TableRow key={plan.id}>
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

          {/* Renewal & Upgrade Transaction History */}
          <Card className="shadow-md">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    Renewal & Upgrade Transaction History
                  </CardTitle>
                  <CardDescription>Complete record of all membership renewals and upgrades</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                  <Button variant="outline" size="sm">
                    <Eye className="h-4 w-4 mr-2" />
                    View All
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gradient-light">
                      <TableHead>Receipt No</TableHead>
                      <TableHead>Transaction ID</TableHead>
                      <TableHead>Member Details</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Plan Change</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Payment Method</TableHead>
                      <TableHead>Date & Time</TableHead>
                      <TableHead>New Expiry</TableHead>
                      <TableHead>Processed By</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {renewalTransactions.map((transaction) => (
                      <TableRow key={transaction.id} className="hover:bg-gray-50">
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Receipt className="h-4 w-4 text-primary" />
                            <span className="font-mono font-medium text-primary">{transaction.receiptNo}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Hash className="h-4 w-4 text-gray-500" />
                            <span className="font-mono text-sm">{transaction.id}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <User className="h-4 w-4 text-gray-500" />
                            <div>
                              <div className="font-medium">{transaction.memberName}</div>
                              <div className="text-xs text-gray-500">{transaction.memberId}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            className={transaction.transactionType === 'Upgrade' 
                              ? 'bg-blue-100 text-blue-800' 
                              : 'bg-green-100 text-green-800'}
                          >
                            <RefreshCw className="h-3 w-3 mr-1" />
                            {transaction.transactionType}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="text-sm text-gray-600">{transaction.previousPlan}</div>
                            <div className="flex items-center text-xs text-green-600">
                              <TrendingUp className="h-3 w-3 mr-1" />
                              {transaction.newPlan}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-semibold text-primary">{transaction.amount}</span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="border-primary/30">
                            {transaction.paymentMethod}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="text-sm font-medium">{transaction.transactionDate.split(' ')[0]}</div>
                            <div className="text-xs text-gray-500">{transaction.transactionDate.split(' ').slice(1).join(' ')}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm font-medium">{transaction.newExpiryDate}</div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">{transaction.processedBy}</div>
                        </TableCell>
                        <TableCell>
                          <Badge className="bg-green-100 text-green-800">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            {transaction.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Transaction Summary */}
              <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="bg-blue-50 border-blue-200">
                  <CardContent className="p-4">
                    <div className="text-sm text-blue-700">Total Transactions</div>
                    <div className="text-2xl font-bold text-blue-900">{renewalTransactions.length}</div>
                  </CardContent>
                </Card>
                <Card className="bg-green-50 border-green-200">
                  <CardContent className="p-4">
                    <div className="text-sm text-green-700">Renewals</div>
                    <div className="text-2xl font-bold text-green-900">
                      {renewalTransactions.filter(t => t.transactionType === 'Renewal').length}
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-purple-50 border-purple-200">
                  <CardContent className="p-4">
                    <div className="text-sm text-purple-700">Upgrades</div>
                    <div className="text-2xl font-bold text-purple-900">
                      {renewalTransactions.filter(t => t.transactionType === 'Upgrade').length}
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-amber-50 border-amber-200">
                  <CardContent className="p-4">
                    <div className="text-sm text-amber-700">Total Revenue</div>
                    <div className="text-2xl font-bold text-amber-900">
                      AED {renewalTransactions.reduce((sum, t) => sum + parseInt(t.amount.replace(/[^\d]/g, '')), 0).toLocaleString()}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>

          {/* Empty State */}
          {!selectedMemberForRenewal && (
            <Card className="border-2 border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <div className="bg-gradient-light p-6 rounded-full mb-4">
                  <RefreshCw className="h-12 w-12 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Start by Searching a Member</h3>
                <p className="text-muted-foreground text-center max-w-md">
                  Search for a member using the search bar above to begin the renewal or upgrade process.
                  The system will automatically detect whether it's a renewal or upgrade based on the selected plan.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="addons" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Member Add-ons</CardTitle>
              <CardDescription>Purchase additional services and packages</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Feature coming soon...</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="receipts" className="space-y-6">
          <Card>
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
          <Card className="border-[#2B7A78]/20">
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

              <Card className="mt-6 border-[#2B7A78]/20 bg-gradient-to-r from-[#DFF5F4]/30 to-white">
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

              {/* Freeze / Unfreeze Transaction History */}
              <Card className="mt-6 border-[#2B7A78]/20">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-[#2B7A78]" />
                        Freeze / Unfreeze Transaction History
                      </CardTitle>
                      <CardDescription>Complete record of all membership freeze and unfreeze actions</CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        <Download className="h-4 w-4 mr-2" />
                        Export
                      </Button>
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4 mr-2" />
                        View All
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border border-[#2B7A78]/10">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gradient-to-r from-[#DFF5F4] to-white">
                          <TableHead className="text-[#2B7A78]">Receipt No</TableHead>
                          <TableHead className="text-[#2B7A78]">Transaction ID</TableHead>
                          <TableHead className="text-[#2B7A78]">Member Details</TableHead>
                          <TableHead className="text-[#2B7A78]">Action</TableHead>
                          <TableHead className="text-[#2B7A78]">Reason</TableHead>
                          <TableHead className="text-[#2B7A78]">Freeze Period</TableHead>
                          <TableHead className="text-[#2B7A78]">Duration</TableHead>
                          <TableHead className="text-[#2B7A78]">Freeze Fee</TableHead>
                          <TableHead className="text-[#2B7A78]">Extra Days Fee</TableHead>
                          <TableHead className="text-[#2B7A78]">Date & Time</TableHead>
                          <TableHead className="text-[#2B7A78]">Processed By</TableHead>
                          <TableHead className="text-[#2B7A78]">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {freezeTransactions.map((transaction) => (
                          <TableRow key={transaction.id} className="hover:bg-gray-50">
                            <TableCell>
                              <div className="flex items-center space-x-2">
                                <Receipt className="h-4 w-4 text-[#2B7A78]" />
                                <span className="font-mono font-medium text-[#2B7A78]">{transaction.receiptNo}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-2">
                                <Hash className="h-4 w-4 text-gray-500" />
                                <span className="font-mono text-sm">{transaction.id}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-2">
                                <User className="h-4 w-4 text-gray-500" />
                                <div>
                                  <div className="font-medium">{transaction.memberName}</div>
                                  <div className="text-xs text-gray-500">{transaction.memberId}</div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge 
                                className={transaction.action === 'Freeze' 
                                  ? 'bg-blue-100 text-blue-800' 
                                  : 'bg-green-100 text-green-800'}
                              >
                                {transaction.action === 'Freeze' ? (
                                  <Snowflake className="h-3 w-3 mr-1" />
                                ) : (
                                  <Play className="h-3 w-3 mr-1" />
                                )}
                                {transaction.action}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm max-w-[150px] truncate" title={transaction.reason}>
                                {transaction.reason}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                <div className="text-xs text-gray-600">From: {transaction.freezeStartDate}</div>
                                <div className="text-xs text-gray-600">To: {transaction.freezeEndDate}</div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="border-[#2B7A78]/30">
                                <Clock className="h-3 w-3 mr-1" />
                                {transaction.duration}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <span className="font-semibold text-[#2B7A78]">{transaction.freezeFee}</span>
                            </TableCell>
                            <TableCell>
                              <span className={`font-semibold ${transaction.extraDaysFee === 'AED 0' ? 'text-green-600' : 'text-amber-600'}`}>
                                {transaction.extraDaysFee}
                              </span>
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                <div className="text-sm font-medium">{transaction.transactionDate.split(' ')[0]}</div>
                                <div className="text-xs text-gray-500">{transaction.transactionDate.split(' ').slice(1).join(' ')}</div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">{transaction.processedBy}</div>
                            </TableCell>
                            <TableCell>
                              <Badge 
                                className={transaction.status === 'Active' 
                                  ? 'bg-blue-100 text-blue-800' 
                                  : 'bg-green-100 text-green-800'}
                              >
                                {transaction.status === 'Active' ? (
                                  <Snowflake className="h-3 w-3 mr-1" />
                                ) : (
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                )}
                                {transaction.status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Transaction Summary */}
                  <div className="mt-6 grid grid-cols-1 md:grid-cols-5 gap-4">
                    <Card className="bg-blue-50 border-blue-200">
                      <CardContent className="p-4">
                        <div className="text-sm text-blue-700">Total Transactions</div>
                        <div className="text-2xl font-bold text-blue-900">{freezeTransactions.length}</div>
                      </CardContent>
                    </Card>
                    <Card className="bg-cyan-50 border-cyan-200">
                      <CardContent className="p-4">
                        <div className="text-sm text-cyan-700">Freeze Actions</div>
                        <div className="text-2xl font-bold text-cyan-900">
                          {freezeTransactions.filter(t => t.action === 'Freeze').length}
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="bg-green-50 border-green-200">
                      <CardContent className="p-4">
                        <div className="text-sm text-green-700">Unfreeze Actions</div>
                        <div className="text-2xl font-bold text-green-900">
                          {freezeTransactions.filter(t => t.action === 'Unfreeze').length}
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="bg-purple-50 border-purple-200">
                      <CardContent className="p-4">
                        <div className="text-sm text-purple-700">Total Freeze Days</div>
                        <div className="text-2xl font-bold text-purple-900">
                          {freezeTransactions.reduce((sum, t) => sum + t.totalDays, 0)} days
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="bg-amber-50 border-amber-200">
                      <CardContent className="p-4">
                        <div className="text-sm text-amber-700">Total Fees</div>
                        <div className="text-2xl font-bold text-amber-900">
                          AED {freezeTransactions.reduce((sum, t) => sum + parseInt(t.extraDaysFee.replace(/[^\d]/g, '')), 0)}
                        </div>
                      </CardContent>
                    </Card>
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
            <div className="bg-gradient-primary p-3 rounded-xl text-white">
              <BarChart3 className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Membership Report</h2>
              <p className="text-sm text-muted-foreground">Generate comprehensive membership transaction reports</p>
            </div>
          </div>

          {/* Report Filters Panel */}
          <Card className="shadow-md">
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
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        const menu = document.getElementById('export-menu');
                        if (menu) menu.classList.toggle('hidden');
                      }}
                      className="relative"
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Export Report
                      <div id="export-menu" className="hidden absolute top-full left-0 mt-2 bg-white border rounded-lg shadow-lg z-10 min-w-[150px]">
                        <button 
                          onClick={() => handleExport('excel')}
                          className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center"
                        >
                          <FileSpreadsheet className="mr-2 h-4 w-4 text-green-600" />
                          Export as Excel
                        </button>
                        <button 
                          onClick={() => handleExport('pdf')}
                          className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center"
                        >
                          <FileText className="mr-2 h-4 w-4 text-red-600" />
                          Export as PDF
                        </button>
                      </div>
                    </Button>

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
              {/* Summary Toast Tab (Sticky) */}
              <div className="sticky top-16 z-30 bg-white border-l-4 border-primary shadow-lg rounded-lg p-4">
                <div className="flex flex-wrap items-center gap-4 text-sm">
                  <div className="flex items-center">
                    <span className="font-semibold text-primary mr-2">📊 Summary:</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-muted-foreground">Total Records:</span>
                    <span className="font-bold">{reportSummary.totalRecords}</span>
                  </div>
                  <div className="h-4 w-px bg-gray-300" />
                  <div className="flex items-center space-x-2">
                    <span className="text-muted-foreground">Total Amount:</span>
                    <span className="font-bold text-green-600">AED {reportSummary.totalAmount.toLocaleString()}</span>
                  </div>
                  <div className="h-4 w-px bg-gray-300" />
                  <div className="flex items-center space-x-2">
                    <span className="text-muted-foreground">Total Cash:</span>
                    <span className="font-bold text-emerald-600">AED {reportSummary.totalCash.toLocaleString()}</span>
                  </div>
                  <div className="h-4 w-px bg-gray-300" />
                  <div className="flex items-center space-x-2">
                    <span className="text-muted-foreground">Total Card:</span>
                    <span className="font-bold text-sky-600">AED {reportSummary.totalCard.toLocaleString()}</span>
                  </div>
                  <div className="h-4 w-px bg-gray-300" />
                  <div className="flex items-center space-x-2">
                    <span className="text-muted-foreground">Total Due:</span>
                    <span className="font-bold text-amber-600">AED {reportSummary.totalDue.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Data Table */}
              <Card>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
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
                          <TableRow key={row.id} className="hover:bg-muted/50">
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
                  <div className="flex items-center justify-between p-4 border-t">
                    <div className="text-sm text-muted-foreground">
                      Showing {reportStartIndex + 1} to {Math.min(reportEndIndex, reportData.length)} of {reportData.length} transactions
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setReportPage(p => Math.max(1, p - 1))}
                        disabled={reportPage === 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Previous
                      </Button>
                      <div className="text-sm">
                        Page {reportPage} of {reportTotalPages}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setReportPage(p => Math.min(reportTotalPages, p + 1))}
                        disabled={reportPage === reportTotalPages}
                      >
                        Next
                        <ChevronRight className="h-4 w-4" />
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
                  
                  {/* Plan Details Collapsible */}
                  <Collapsible className="mt-4">
                    <CollapsibleTrigger asChild>
                      <Button 
                        variant="outline" 
                        className="w-full justify-between text-sm"
                        size="sm"
                      >
                        Plan details
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-3 space-y-2 rounded-md border border-gray-200 bg-gray-50 p-3">
                      {(() => {
                        const plan = membershipPlans.find(p => p.name === selectedMember.membership) || membershipPlans[0];
                        return (
                          <>
                            <div className="text-sm">
                              <strong className="text-[#327F74]">Plan Name:</strong> {plan.name}
                            </div>
                            <div className="text-sm">
                              <strong className="text-[#327F74]">Plan Type:</strong> {plan.planType}
                            </div>
                            <div className="text-sm">
                              <strong className="text-[#327F74]">Membership Type:</strong> {plan.membershipType}
                            </div>
                            <div className="text-sm">
                              <strong className="text-[#327F74]">Duration Type:</strong> {plan.durationType}
                            </div>
                            <div className="text-sm">
                              <strong className="text-[#327F74]">Duration Value:</strong> {plan.durationValue} {plan.durationType === 'Monthly' ? 'month(s)' : plan.durationType === 'Quarterly' ? 'quarter(s)' : 'year(s)'}
                            </div>
                            <div className="text-sm">
                              <strong className="text-[#327F74]">Price:</strong> AED {plan.price}
                            </div>
                            <div className="text-sm">
                              <strong className="text-[#327F74]">Discount:</strong> {plan.discount}%
                            </div>
                            <div className="text-sm">
                              <strong className="text-[#327F74]">Max Number of Sessions:</strong> {plan.maxSessions === 0 ? 'Unlimited' : plan.maxSessions}
                            </div>
                            <div className="text-sm">
                              <strong className="text-[#327F74]">Assignable Trainers:</strong> {plan.assignableTrainers.length > 0 ? plan.assignableTrainers.join(', ') : 'None'}
                            </div>
                            <div className="text-sm">
                              <strong className="text-[#327F74]">Description:</strong> {plan.description}
                            </div>
                          </>
                        );
                      })()}
                    </CollapsibleContent>
                  </Collapsible>
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

      {/* Member Analytics Modal */}
      {selectedMemberForAnalytics && (() => {
        const m = selectedMemberForAnalytics;
        const memberId = getMemberId(m);
        const joinDate = new Date(m.join_date || m.joinDate || m.created_at || Date.now());
        const expiryDate = m.expiry_date || m.expiryDate || m.membership_end_date;
        const fee = m.monthly_fee || m.membershipFee || m.membership_fee || 0;
        const totalVisits = getTotalVisits(m);
        const daysSinceJoining = Math.max(1, Math.floor((Date.now() - joinDate.getTime()) / 86400000));
        const avgVisitsPerMonth = totalVisits > 0 ? (totalVisits / Math.max(1, daysSinceJoining / 30)).toFixed(1) : '0';
        const totalRevenue = fee * Math.max(1, Math.ceil(daysSinceJoining / 30));

        // Generate deterministic monthly attendance data seeded from member id
        const seed = memberId.split('').reduce((a: number, c: string) => a + c.charCodeAt(0), 0);
        const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        const now = new Date();
        const attendanceData = Array.from({ length: 6 }, (_, i) => {
          const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
          const base = ((seed + i * 7) % 16) + 4;
          return {
            month: months[d.getMonth()],
            visits: base,
            target: 12,
          };
        });

        const financialData = Array.from({ length: 6 }, (_, i) => {
          const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
          return {
            month: months[d.getMonth()],
            paid: fee,
            due: 0,
          };
        });

        const engagementData = [
          { subject: 'Attendance', value: Math.min(100, Math.round((totalVisits / Math.max(1, daysSinceJoining / 30)) * 8.33)), fill: '#327F74' },
          { subject: 'Punctuality', value: ((seed % 20) + 70), fill: '#2B7A78' },
          { subject: 'Class Join', value: ((seed * 3) % 30) + 50, fill: '#4BA3A0' },
          { subject: 'Goal Progress', value: ((seed * 2) % 25) + 60, fill: '#76C7C4' },
        ];

        const statusColor = m.membership_status === 'active' ? 'bg-emerald-100 text-emerald-700'
          : m.membership_status === 'expired' ? 'bg-red-100 text-red-700'
          : m.membership_status === 'suspended' ? 'bg-yellow-100 text-yellow-700'
          : 'bg-gray-100 text-gray-600';

        const payColor = m.payment_status === 'paid' ? 'bg-emerald-100 text-emerald-700'
          : m.payment_status === 'overdue' ? 'bg-red-100 text-red-700'
          : 'bg-yellow-100 text-yellow-700';

        return (
          <Dialog open={!!selectedMemberForAnalytics} onOpenChange={() => setSelectedMemberForAnalytics(null)}>
            <DialogContent className="sm:max-w-[820px] max-h-[90vh] overflow-y-auto p-0">
              {/* Header */}
              <div className="bg-gradient-to-br from-[#327F74] to-[#2B7A78] p-6 rounded-t-lg">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-4">
                    <Avatar className="h-16 w-16 border-2 border-white/30">
                      <AvatarImage src={m.avatar} />
                      <AvatarFallback className="bg-white/20 text-white text-xl font-bold">
                        {m.name?.split(' ').map((n: string) => n[0]).join('') || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h2 className="text-xl font-bold text-white">{m.name}</h2>
                      <p className="text-white/70 text-sm">Member ID: {memberId}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge className={statusColor}>{m.membership_status}</Badge>
                        <Badge className={payColor}>{m.payment_status}</Badge>
                      </div>
                    </div>
                  </div>
                  <div className="text-right text-white/80 text-sm">
                    <p>Joined {joinDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                    {expiryDate && <p>Expires {new Date(expiryDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>}
                    <p className="mt-1 font-semibold text-white">{m.membership_plan || m.membership_type || 'Standard'}</p>
                  </div>
                </div>

                {/* KPI strip */}
                <div className="grid grid-cols-4 gap-3 mt-2">
                  {[
                    { label: 'Total Visits', value: totalVisits, icon: <Activity className="h-4 w-4" />, sub: `${avgVisitsPerMonth}/mo avg` },
                    { label: 'Days Active', value: daysSinceJoining, icon: <CalendarDays className="h-4 w-4" />, sub: `Since joining` },
                    { label: 'Monthly Fee', value: `AED ${fee}`, icon: <DollarSign className="h-4 w-4" />, sub: m.payment_status },
                    { label: 'Lifetime Value', value: `AED ${totalRevenue.toLocaleString()}`, icon: <Award className="h-4 w-4" />, sub: `Est. total paid` },
                  ].map((kpi, i) => (
                    <div key={i} className="bg-white/10 rounded-lg p-3 text-white">
                      <div className="flex items-center gap-1 text-white/70 text-xs mb-1">
                        {kpi.icon}
                        {kpi.label}
                      </div>
                      <div className="text-lg font-bold">{kpi.value}</div>
                      <div className="text-xs text-white/60 capitalize">{kpi.sub}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tabs */}
              <div className="p-6">
                <Tabs value={analyticsTab} onValueChange={setAnalyticsTab}>
                  <TabsList className="mb-6">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="attendance">Attendance</TabsTrigger>
                    <TabsTrigger value="financial">Financial</TabsTrigger>
                    <TabsTrigger value="engagement">Engagement</TabsTrigger>
                  </TabsList>

                  {/* Overview Tab */}
                  <TabsContent value="overview" className="space-y-5">
                    <div className="grid grid-cols-2 gap-5">
                      {/* Attendance trend */}
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-semibold flex items-center gap-2">
                            <Activity className="h-4 w-4 text-[#327F74]" /> Monthly Visits
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ResponsiveContainer width="100%" height={160}>
                            <BarChart data={attendanceData} barSize={18}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                              <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                              <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                              <Tooltip formatter={(v: any) => [`${v} visits`, '']} />
                              <Bar dataKey="visits" fill="#327F74" radius={[4, 4, 0, 0]} />
                              <Bar dataKey="target" fill="#E63946" radius={[4, 4, 0, 0]} opacity={0.25} />
                            </BarChart>
                          </ResponsiveContainer>
                          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-[#327F74] inline-block" /> Actual</span>
                            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-[#E63946] opacity-50 inline-block" /> Target</span>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Member info summary */}
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-semibold flex items-center gap-2">
                            <User className="h-4 w-4 text-[#327F74]" /> Member Info
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2 text-sm">
                          {[
                            { label: 'Email', value: m.email },
                            { label: 'Phone', value: m.phone },
                            { label: 'Plan', value: m.membership_plan || m.membership_type || '—' },
                            { label: 'Blood Type', value: m.blood_type || '—' },
                            { label: 'Emergency Contact', value: m.emergency_contact_name || m.emergency_contact || '—' },
                            { label: 'Emergency Phone', value: m.emergency_contact_phone || m.emergency_phone || '—' },
                          ].map((row, i) => (
                            <div key={i} className="flex justify-between items-center py-1 border-b border-gray-50 last:border-0">
                              <span className="text-muted-foreground">{row.label}</span>
                              <span className="font-medium text-right max-w-[55%] truncate">{row.value}</span>
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                    </div>

                    {/* Engagement radial bars */}
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-semibold flex items-center gap-2">
                          <Star className="h-4 w-4 text-[#327F74]" /> Engagement Snapshot
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-4 gap-4">
                          {engagementData.map((item, i) => (
                            <div key={i} className="flex flex-col items-center">
                              <div className="relative w-20 h-20">
                                <svg viewBox="0 0 80 80" className="w-full h-full -rotate-90">
                                  <circle cx="40" cy="40" r="32" fill="none" stroke="#f0f0f0" strokeWidth="8" />
                                  <circle
                                    cx="40" cy="40" r="32" fill="none" stroke={item.fill} strokeWidth="8"
                                    strokeDasharray={`${(item.value / 100) * 201} 201`}
                                    strokeLinecap="round"
                                  />
                                </svg>
                                <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-[#327F74]">
                                  {item.value}%
                                </span>
                              </div>
                              <p className="text-xs text-muted-foreground mt-2 text-center">{item.subject}</p>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* Attendance Tab */}
                  <TabsContent value="attendance" className="space-y-5">
                    <div className="grid grid-cols-3 gap-4">
                      {[
                        { label: 'Total Visits', value: totalVisits, icon: <CheckCircle className="h-5 w-5 text-emerald-500" />, color: 'bg-emerald-50' },
                        { label: 'Avg / Month', value: avgVisitsPerMonth, icon: <TrendingUp className="h-5 w-5 text-[#327F74]" />, color: 'bg-teal-50' },
                        { label: 'Target (12/mo)', value: `${Math.round((parseFloat(avgVisitsPerMonth) / 12) * 100)}%`, icon: <Target className="h-5 w-5 text-blue-500" />, color: 'bg-blue-50' },
                      ].map((kpi, i) => (
                        <div key={i} className={`${kpi.color} rounded-xl p-4 flex items-center gap-3`}>
                          {kpi.icon}
                          <div>
                            <p className="text-xs text-muted-foreground">{kpi.label}</p>
                            <p className="text-xl font-bold">{kpi.value}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-semibold">6-Month Attendance vs Target</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={220}>
                          <AreaChart data={attendanceData}>
                            <defs>
                              <linearGradient id="colorVisits" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#327F74" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#327F74" stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f5f5f5" />
                            <XAxis dataKey="month" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                            <Tooltip />
                            <Area type="monotone" dataKey="visits" stroke="#327F74" strokeWidth={2} fill="url(#colorVisits)" name="Visits" />
                            <Line type="monotone" dataKey="target" stroke="#E63946" strokeWidth={1.5} strokeDasharray="4 4" dot={false} name="Target" />
                          </AreaChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-semibold">Monthly Breakdown</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Month</TableHead>
                              <TableHead>Visits</TableHead>
                              <TableHead>Target</TableHead>
                              <TableHead>Achievement</TableHead>
                              <TableHead>Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {attendanceData.map((row, i) => {
                              const pct = Math.round((row.visits / row.target) * 100);
                              return (
                                <TableRow key={i}>
                                  <TableCell className="font-medium">{row.month}</TableCell>
                                  <TableCell>{row.visits}</TableCell>
                                  <TableCell>{row.target}</TableCell>
                                  <TableCell>
                                    <div className="flex items-center gap-2">
                                      <div className="flex-1 bg-gray-100 rounded-full h-2 w-24">
                                        <div
                                          className="h-2 rounded-full"
                                          style={{ width: `${Math.min(100, pct)}%`, backgroundColor: pct >= 100 ? '#327F74' : pct >= 70 ? '#f59e0b' : '#E63946' }}
                                        />
                                      </div>
                                      <span className="text-xs">{pct}%</span>
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <Badge className={pct >= 100 ? 'bg-emerald-100 text-emerald-700' : pct >= 70 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}>
                                      {pct >= 100 ? 'Excellent' : pct >= 70 ? 'Good' : 'Low'}
                                    </Badge>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* Financial Tab */}
                  <TabsContent value="financial" className="space-y-5">
                    <div className="grid grid-cols-3 gap-4">
                      {[
                        { label: 'Monthly Fee', value: `AED ${fee}`, icon: <CreditCard className="h-5 w-5 text-[#327F74]" />, color: 'bg-teal-50' },
                        { label: 'Lifetime Revenue', value: `AED ${totalRevenue.toLocaleString()}`, icon: <Banknote className="h-5 w-5 text-emerald-500" />, color: 'bg-emerald-50' },
                        { label: 'Payment Status', value: m.payment_status, icon: <Wallet className="h-5 w-5 text-blue-500" />, color: 'bg-blue-50' },
                      ].map((kpi, i) => (
                        <div key={i} className={`${kpi.color} rounded-xl p-4 flex items-center gap-3`}>
                          {kpi.icon}
                          <div>
                            <p className="text-xs text-muted-foreground">{kpi.label}</p>
                            <p className="text-base font-bold capitalize">{kpi.value}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-semibold">Payment History (6 Months)</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={200}>
                          <BarChart data={financialData} barSize={22}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                            <XAxis dataKey="month" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                            <Tooltip formatter={(v: any) => [`AED ${v}`, '']} />
                            <Bar dataKey="paid" fill="#327F74" radius={[4, 4, 0, 0]} name="Paid" />
                          </BarChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-semibold">Transaction Summary</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Month</TableHead>
                              <TableHead>Amount</TableHead>
                              <TableHead>Type</TableHead>
                              <TableHead>Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {financialData.map((row, i) => (
                              <TableRow key={i}>
                                <TableCell className="font-medium">{row.month}</TableCell>
                                <TableCell>AED {row.paid}</TableCell>
                                <TableCell>Membership Fee</TableCell>
                                <TableCell>
                                  <Badge className="bg-emerald-100 text-emerald-700">Paid</Badge>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* Engagement Tab */}
                  <TabsContent value="engagement" className="space-y-5">
                    <div className="grid grid-cols-2 gap-5">
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-semibold flex items-center gap-2">
                            <Zap className="h-4 w-4 text-[#327F74]" /> Engagement Scores
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          {engagementData.map((item, i) => (
                            <div key={i}>
                              <div className="flex justify-between text-sm mb-1">
                                <span className="text-muted-foreground">{item.subject}</span>
                                <span className="font-semibold">{item.value}%</span>
                              </div>
                              <div className="w-full bg-gray-100 rounded-full h-2.5">
                                <div
                                  className="h-2.5 rounded-full transition-all"
                                  style={{ width: `${item.value}%`, backgroundColor: item.fill }}
                                />
                              </div>
                            </div>
                          ))}
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-semibold flex items-center gap-2">
                            <Award className="h-4 w-4 text-[#327F74]" /> Achievements
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {[
                            { label: 'First Visit', earned: true, desc: 'Completed first gym visit' },
                            { label: '10 Visits Milestone', earned: totalVisits >= 10, desc: '10 total check-ins' },
                            { label: '25 Visits Milestone', earned: totalVisits >= 25, desc: '25 total check-ins' },
                            { label: '50 Visits Milestone', earned: totalVisits >= 50, desc: '50 total check-ins' },
                            { label: 'Loyal Member', earned: daysSinceJoining >= 180, desc: '6+ months membership' },
                            { label: 'Annual Member', earned: daysSinceJoining >= 365, desc: '1+ year membership' },
                          ].map((ach, i) => (
                            <div key={i} className={`flex items-center gap-3 p-2 rounded-lg ${ach.earned ? 'bg-teal-50' : 'bg-gray-50 opacity-50'}`}>
                              <div className={`h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 ${ach.earned ? 'bg-[#327F74]' : 'bg-gray-300'}`}>
                                <Star className="h-4 w-4 text-white" />
                              </div>
                              <div>
                                <p className="text-sm font-medium">{ach.label}</p>
                                <p className="text-xs text-muted-foreground">{ach.desc}</p>
                              </div>
                              {ach.earned && <CheckCircle className="h-4 w-4 text-[#327F74] ml-auto" />}
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                    </div>

                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-semibold flex items-center gap-2">
                          <Target className="h-4 w-4 text-[#327F74]" /> Health Profile
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          {[
                            { label: 'Date of Birth', value: m.date_of_birth ? new Date(m.date_of_birth).toLocaleDateString('en-GB') : '—' },
                            { label: 'Blood Type', value: m.blood_type || '—' },
                            { label: 'Medical Conditions', value: m.medical_conditions || 'None reported' },
                            { label: 'Allergies', value: m.allergies || 'None reported' },
                            { label: 'Current Medications', value: m.current_medications || 'None' },
                            { label: 'Health Notes', value: m.health_notes || '—' },
                          ].map((row, i) => (
                            <div key={i} className="p-3 bg-gray-50 rounded-lg">
                              <p className="text-xs text-muted-foreground mb-0.5">{row.label}</p>
                              <p className="font-medium">{row.value}</p>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </div>
            </DialogContent>
          </Dialog>
        );
      })()}

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
